/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

// antlr4's type declarations use extensionless relative imports inside a
// "type": "module" package, which breaks under moduleResolution: nodenext.
// This ambient declaration provides the types kbn-monaco needs directly.

declare module 'antlr4' {
  export class Token {
    static INVALID_TYPE: number;
    static EOF: number;
    static DEFAULT_CHANNEL: number;
    static HIDDEN_CHANNEL: number;
    tokenIndex: number;
    line: number;
    column: number;
    channel: number;
    text: string;
    type: number;
    start: number;
    stop: number;
    clone(): Token;
    cloneWithType(type: number): Token;
    getTokenSource(): any;
    getInputStream(): CharStream;
  }

  export class CharStream {
    getText(start: number, stop: number): string;
    LA(offset: number): number;
    reset(): void;
    size: number;
  }

  export class CharStreams {
    static fromString(data: string, decodeToUnicodeCodePoints?: boolean): CharStream;
  }

  export class Interval {
    start: number;
    stop: number;
    constructor(start: number, stop: number);
    contains(item: number): boolean;
    length: number;
  }

  export class IntervalSet {
    intervals: Interval[];
    addOne(v: number): void;
    addRange(l: number, h: number): void;
    addInterval(v: Interval): void;
    contains(item: number): boolean;
  }

  export class RecognitionException extends Error {
    ctx: RuleContext;
    offendingToken: Token | null;
    constructor(params: {
      message: string;
      recognizer?: Recognizer<never>;
      input?: CharStream | TokenStream;
      ctx?: ParserRuleContext;
    });
  }

  export class ErrorListener<TSymbol> {
    syntaxError(
      recognizer: Recognizer<TSymbol>,
      offendingSymbol: TSymbol,
      line: number,
      column: number,
      msg: string,
      e: RecognitionException | undefined
    ): void;
  }

  export class Recognizer<TSymbol> {
    state: number;
    removeErrorListeners(): void;
    addErrorListener(listener: ErrorListener<TSymbol>): void;
    getErrorListener(): ErrorListener<TSymbol>;
    getLiteralNames(): string[];
    getSymbolicNames(): string[];
  }

  export class TokenStream {
    index: number;
    size: number;
    LA(i: number): number;
    LT(k: number): Token;
    getText(interval?: Interval): string;
    getHiddenTokensToLeft(tokenIndex: number, channelIndex?: number): Token[];
    getHiddenTokensToRight(tokenIndex: number, channelIndex?: number): Token[];
    get(idx: number): Token;
  }

  export class BufferedTokenStream extends TokenStream {
    constructor(tokenSource: any);
  }

  export class CommonTokenStream extends BufferedTokenStream {
    tokens: Token[];
    constructor(lexer: Lexer, channel?: number);
    fill(): void;
  }

  export class Lexer extends Recognizer<number> {
    constructor(input: CharStream);
    nextToken(): Token;
    getAllTokens(): Token[];
  }

  export class Parser extends Recognizer<Token> {
    constructor(input: TokenStream);
    notifyErrorListeners(
      msg: string,
      offendingToken: Token,
      err: RecognitionException | undefined
    ): void;
    removeParseListeners(): void;
  }

  export class RuleContext {
    parentCtx: RuleContext | null;
    invokingState: number;
  }

  export class ParserRuleContext extends RuleContext {
    start: Token | null;
    stop: Token | null;
    exception: RecognitionException | null;
    children: (RuleContext | TerminalNode)[] | null;
  }

  export class TerminalNode {
    symbol: Token;
    parentCtx: RuleContext;
  }

  export class RuleNode {
    parentCtx: RuleContext;
  }

  export class PredictionMode {
    static SLL: number;
    static LL: number;
    static LL_EXACT_AMBIG_DETECTION: number;
  }

  export class PredictionContextCache {
    constructor();
  }
}
