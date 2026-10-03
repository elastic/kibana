/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Best-effort generator that turns a user-authored regex source into a short string that
 * actually matches it, so the pattern tester's example input can demonstrate the specific rule
 * being edited instead of only a fixed, unrelated example.
 *
 * This intentionally supports only the practical subset of regex syntax expected for
 * organization-specific identifiers (literals, escapes, character classes, groups, alternation,
 * and quantifiers). Anything outside that subset (lookaround, backreferences, negated character
 * classes, unicode property escapes, ...) is rejected rather than guessed at, and the generated
 * string is always re-validated against the real pattern before being returned — so a caller can
 * never end up injecting a value that doesn't actually match.
 */

/** Thrown for any regex construct outside the supported subset; always caught and swallowed. */
const unsupportedPatternError = (message: string): Error =>
  Object.assign(new Error(message), { name: 'UnsupportedPatternError' });

interface Quantifier {
  min: number;
  max?: number;
}

interface AtomExpansion {
  /** The text for a single (unquantified) occurrence of this atom. */
  once: string;
  /** When set, repeats cycle through this pool instead of repeating `once` verbatim. */
  pool?: string;
}

const MAX_REPEAT = 12;
const MAX_GENERATED_LENGTH = 60;

const DIGIT_POOL = '4826197350';
const LOWER_POOL = 'jkqxzmvbnl';
const UPPER_POOL = 'JKQXZMVBNL';
const WORD_POOL = 'a1b2c3d4e5';

const repeatCountFor = (quantifier: Quantifier | undefined): number => {
  if (!quantifier) {
    return 1;
  }
  const { min, max } = quantifier;
  if (min === 0 && max === 1) {
    return 1; // `?`
  }
  if (max === undefined) {
    return min === 0 ? 3 : Math.min(min + 2, MAX_REPEAT); // `*` or `+` or `{n,}`
  }
  if (min === 0) {
    return Math.min(max, 3); // `{0,m}`
  }
  return Math.min(min, MAX_REPEAT); // `{n}` or `{n,m}`
};

const expandAtom = (atom: AtomExpansion, count: number): string => {
  if (count <= 0) {
    return '';
  }
  const { once, pool } = atom;
  if (pool && once.length === 1) {
    return Array.from({ length: count }, (_, i) => pool[i % pool.length]).join('');
  }
  return once.repeat(count);
};

const classifyCharClass = (content: string): AtomExpansion => {
  if (content.length === 0) {
    throw unsupportedPatternError('Empty character class');
  }
  if (/\\d/.test(content) || /[^\\]0-9|^0-9/.test(content)) {
    return { once: '4', pool: DIGIT_POOL };
  }
  if (/\\s/.test(content)) {
    return { once: ' ' };
  }
  if (/\\w/.test(content)) {
    return { once: 'a', pool: WORD_POOL };
  }
  if (/a-z/.test(content)) {
    return { once: 'j', pool: LOWER_POOL };
  }
  if (/A-Z/.test(content)) {
    return { once: 'J', pool: UPPER_POOL };
  }
  // Fall back to the class's first literal character (de-escaping it if needed).
  const match = content.match(/\\(.)|(.)/);
  if (!match) {
    throw unsupportedPatternError('Unrecognized character class contents');
  }
  return { once: match[1] ?? match[2] };
};

/** Recursive-descent generator for the supported regex subset; see module doc for scope. */
class PatternExampleGenerator {
  private pos = 0;

  constructor(private readonly src: string) {}

  generate(): string {
    const result = this.parseExpr();
    if (this.pos < this.src.length) {
      throw unsupportedPatternError(`Unexpected trailing character at index ${this.pos}`);
    }
    return result;
  }

  private peek(): string | undefined {
    return this.src[this.pos];
  }

  /** One or more `|`-separated sequences; only the first alternative is used for the example. */
  private parseExpr(): string {
    const first = this.parseSequence();
    while (this.peek() === '|') {
      this.pos++;
      this.skipToNextAlternativeOrGroupEnd();
    }
    return first;
  }

  private parseSequence(): string {
    let result = '';
    while (this.pos < this.src.length) {
      const c = this.peek();
      if (c === '|' || c === ')') {
        break;
      }
      result += this.parseTerm();
    }
    return result;
  }

  private parseTerm(): string {
    const atom = this.parseAtom();
    const quantifier = this.tryParseQuantifier();
    if (this.peek() === '?') {
      this.pos++; // lazy modifier, doesn't affect which text we generate
    }
    return expandAtom(atom, repeatCountFor(quantifier));
  }

  private parseAtom(): AtomExpansion {
    const c = this.peek();
    if (c === undefined) {
      throw unsupportedPatternError('Unexpected end of pattern');
    }
    if (c === '^' || c === '$') {
      this.pos++;
      return { once: '' };
    }
    if (c === '.') {
      this.pos++;
      return { once: 'x' };
    }
    if (c === '(') {
      return this.parseGroup();
    }
    if (c === '[') {
      return this.parseCharClass();
    }
    if (c === '\\') {
      return this.parseEscape();
    }
    if (c === '*' || c === '+' || c === '?' || c === '{' || c === ')') {
      throw unsupportedPatternError(`Unexpected metacharacter '${c}'`);
    }
    this.pos++;
    return { once: c };
  }

  private parseGroup(): AtomExpansion {
    this.pos++; // consume '('
    if (this.peek() === '?') {
      const modifier = this.src[this.pos + 1];
      if (modifier === ':') {
        this.pos += 2;
      } else if (modifier === '<') {
        const afterAngle = this.src[this.pos + 2];
        if (afterAngle === '=' || afterAngle === '!') {
          throw unsupportedPatternError('Lookbehind assertions are not supported');
        }
        const closeAngle = this.src.indexOf('>', this.pos);
        if (closeAngle === -1) {
          throw unsupportedPatternError('Malformed named group');
        }
        this.pos = closeAngle + 1;
      } else if (modifier === '=' || modifier === '!') {
        throw unsupportedPatternError('Lookahead assertions are not supported');
      } else {
        throw unsupportedPatternError('Unsupported group modifier');
      }
    }
    const inner = this.parseExpr();
    if (this.peek() !== ')') {
      throw unsupportedPatternError('Unbalanced parenthesis');
    }
    this.pos++; // consume ')'
    return { once: inner };
  }

  private parseCharClass(): AtomExpansion {
    this.pos++; // consume '['
    if (this.peek() === '^') {
      throw unsupportedPatternError('Negated character classes are not supported');
    }
    const contentStart = this.pos;
    while (this.pos < this.src.length && this.src[this.pos] !== ']') {
      this.pos += this.src[this.pos] === '\\' ? 2 : 1;
    }
    if (this.src[this.pos] !== ']') {
      throw unsupportedPatternError('Unbalanced character class');
    }
    const content = this.src.slice(contentStart, this.pos);
    this.pos++; // consume ']'
    return classifyCharClass(content);
  }

  private parseEscape(): AtomExpansion {
    this.pos++; // consume backslash
    const c = this.src[this.pos];
    if (c === undefined) {
      throw unsupportedPatternError('Trailing backslash');
    }
    this.pos++;
    switch (c) {
      case 'd':
        return { once: '4', pool: DIGIT_POOL };
      case 'D':
        return { once: 'x' };
      case 'w':
        return { once: 'a', pool: WORD_POOL };
      case 'W':
        return { once: '-' };
      case 's':
        return { once: ' ' };
      case 'S':
        return { once: 'x' };
      case 'b':
      case 'B':
        return { once: '' };
      case 'n':
        return { once: '\n' };
      case 't':
        return { once: '\t' };
      case 'r':
        return { once: '\r' };
      default:
        if (/[A-Za-z0-9]/.test(c)) {
          // Unknown letter/digit escape, e.g. `\p{...}` unicode properties or `\1` backreferences.
          throw unsupportedPatternError(`Unsupported escape sequence '\\${c}'`);
        }
        return { once: c }; // escaped punctuation, e.g. `\.`, `\-`, `\/`
    }
  }

  private tryParseQuantifier(): Quantifier | undefined {
    const c = this.peek();
    if (c === '*') {
      this.pos++;
      return { min: 0 };
    }
    if (c === '+') {
      this.pos++;
      return { min: 1 };
    }
    if (c === '?') {
      this.pos++;
      return { min: 0, max: 1 };
    }
    if (c === '{') {
      const closeIdx = this.src.indexOf('}', this.pos);
      if (closeIdx === -1) {
        return undefined;
      }
      const body = this.src.slice(this.pos + 1, closeIdx);
      const match = /^(\d+)(,(\d*))?$/.exec(body);
      if (!match) {
        return undefined; // not a real quantifier, e.g. a literal '{'
      }
      this.pos = closeIdx + 1;
      const min = parseInt(match[1], 10);
      const max =
        match[2] === undefined ? min : match[3] === '' ? undefined : parseInt(match[3], 10);
      return { min, max };
    }
    return undefined;
  }

  /** Advances past one `|`-branch (respecting nesting) without generating text for it. */
  private skipToNextAlternativeOrGroupEnd(): void {
    let depth = 0;
    while (this.pos < this.src.length) {
      const c = this.src[this.pos];
      if (c === '\\') {
        this.pos += 2;
        continue;
      }
      if (c === '[') {
        this.pos++;
        if (this.src[this.pos] === '^') {
          this.pos++;
        }
        while (this.pos < this.src.length && this.src[this.pos] !== ']') {
          this.pos += this.src[this.pos] === '\\' ? 2 : 1;
        }
        this.pos++; // consume ']'
        continue;
      }
      if (c === '(') {
        depth++;
        this.pos++;
        continue;
      }
      if (c === ')') {
        if (depth === 0) {
          return;
        }
        depth--;
        this.pos++;
        continue;
      }
      if (c === '|' && depth === 0) {
        return;
      }
      this.pos++;
    }
  }
}

/** Turns a pattern's name (or, failing that, its entity class) into a JSON-friendly field key. */
export const toExampleFieldKey = (label: string): string =>
  label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '') || 'value';

/**
 * Generates a short string that matches `pattern`, for use as a contextual pattern-tester
 * example. Returns `undefined` (rather than a guess) when the pattern uses syntax outside the
 * supported subset, or if the generated string somehow fails to match the real regex.
 */
export const generateSampleForPattern = (pattern: string): string | undefined => {
  const trimmed = pattern.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    const sample = new PatternExampleGenerator(trimmed).generate();
    if (!sample || sample.length > MAX_GENERATED_LENGTH) {
      return undefined;
    }
    return new RegExp(trimmed).test(sample) ? sample : undefined;
  } catch {
    return undefined;
  }
};
