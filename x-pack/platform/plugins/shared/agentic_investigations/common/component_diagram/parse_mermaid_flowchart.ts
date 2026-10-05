/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A parser for the subset of Mermaid `flowchart` syntax a component diagram uses: nodes with
 * their shapes, edges (with labels, dotted and thick styles), `&` lists, subgraphs, and classes.
 * Kibana ships no Mermaid renderer, so the browser lays the parsed graph out itself.
 */

export type FlowchartDirection = 'TB' | 'BT' | 'LR' | 'RL';

export type FlowchartNodeShape =
  | 'rectangle'
  | 'rounded'
  | 'stadium'
  | 'circle'
  | 'database'
  | 'subroutine'
  | 'diamond'
  | 'hexagon'
  | 'parallelogram'
  | 'flag';

export interface FlowchartNode {
  id: string;
  label: string;
  shape: FlowchartNodeShape;
  classes: string[];
  /** The label of the innermost subgraph the node was first declared in. */
  group?: string;
}

export interface FlowchartEdge {
  source: string;
  target: string;
  label?: string;
  dotted: boolean;
  thick: boolean;
  /** Where the arrowheads are. */
  arrow: 'none' | 'forward' | 'both';
}

export interface Flowchart {
  direction: FlowchartDirection;
  nodes: FlowchartNode[];
  edges: FlowchartEdge[];
  /** Statements the parser did not understand; they are left out of the graph. */
  skipped: string[];
}

const HEADER_RE = /^(?:flowchart|graph)(?:\s+(TD|TB|BT|LR|RL))?\s*;?$/i;
const ID_RE = /[A-Za-z0-9_][\w-]*/y;
const CLASS_SUFFIX_RE = /:::([\w-]+)/y;
const SIMPLE_LINK_RE = /\s*(<)?(-{2,}|={2,}|-\.+-)(>|[ox](?=\s))?\s*(?:\|([^|]*)\|)?\s*/y;
const TEXT_LINK_RE = /\s*(<)?(--|==|-\.)\s+(?![->=.])(.+?)\s+(-{2,}|={2,}|\.+-)(>|[ox](?=\s))?\s*/y;
const IGNORED_STATEMENT_RE = /^(?:classDef|style|linkStyle|click|direction|accTitle|accDescr)\b/;
const CLASS_STATEMENT_RE = /^class\s+([\w-]+(?:\s*,\s*[\w-]+)*)\s+([\w-]+)$/;
const SUBGRAPH_RE = /^subgraph\s+(.+)$/;

/** Openers in the order they must be tried: longer ones first, as they start with shorter ones. */
const SHAPES: ReadonlyArray<readonly [string, string, FlowchartNodeShape]> = [
  ['([', '])', 'stadium'],
  ['((', '))', 'circle'],
  ['[(', ')]', 'database'],
  ['[[', ']]', 'subroutine'],
  ['[/', '/]', 'parallelogram'],
  ['[\\', '\\]', 'parallelogram'],
  ['{{', '}}', 'hexagon'],
  ['[', ']', 'rectangle'],
  ['(', ')', 'rounded'],
  ['{', '}', 'diamond'],
  ['>', ']', 'flag'],
];

const unquote = (text: string): string => {
  const trimmed = text.trim();
  return trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')
    ? trimmed.slice(1, -1)
    : trimmed;
};

/** Mermaid labels may carry `<br>` line breaks and `#quot;` style entities. */
const cleanLabel = (text: string): string =>
  unquote(text)
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/#quot;/g, '"')
    .replace(/#amp;/g, '&')
    .replace(/#lt;/g, '<')
    .replace(/#gt;/g, '>');

/** Splits on newlines and on `;` outside quotes, brackets, and edge labels. */
const splitStatements = (source: string): string[] => {
  const statements: string[] = [];
  for (const line of source.split(/\r?\n/)) {
    let current = '';
    let quoted = false;
    let depth = 0;
    let piped = false;
    for (const char of line) {
      if (char === '"') quoted = !quoted;
      else if (!quoted && '[({'.includes(char)) depth++;
      else if (!quoted && '])}'.includes(char)) depth = Math.max(0, depth - 1);
      else if (!quoted && depth === 0 && char === '|') piped = !piped;
      if (char === ';' && !quoted && depth === 0 && !piped) {
        statements.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    statements.push(current);
  }
  return statements.map((statement) => statement.trim()).filter(Boolean);
};

interface NodeRef {
  id: string;
  label?: string;
  shape?: FlowchartNodeShape;
  classes: string[];
}

/** Reads `id`, `id[label]` (or another shape), and an optional `:::class` at `position`. */
const readNode = (text: string, position: number): { node: NodeRef; end: number } | undefined => {
  ID_RE.lastIndex = position;
  const idMatch = ID_RE.exec(text);
  if (!idMatch) return undefined;
  let end = ID_RE.lastIndex;
  let id = idMatch[0];
  // `A-->B` would otherwise read `A--` as the id, and `A-.->B` would read `A-`.
  const arrowStart = id.search(/-{2}|-$/);
  if (arrowStart > 0) {
    id = id.slice(0, arrowStart);
    end = position + arrowStart;
  }

  const node: NodeRef = { id, classes: [] };
  const shape = SHAPES.find(([open]) => text.startsWith(open, end));
  if (shape) {
    const [open, close, shapeName] = shape;
    const labelStart = end + open.length;
    let closeAt: number;
    if (text[labelStart] === '"') {
      const quoteEnd = text.indexOf('"', labelStart + 1);
      if (quoteEnd === -1) return undefined;
      closeAt = text.indexOf(close, quoteEnd + 1);
    } else {
      closeAt = text.indexOf(close, labelStart);
    }
    if (closeAt === -1) return undefined;
    node.label = cleanLabel(text.slice(labelStart, closeAt));
    node.shape = shapeName;
    end = closeAt + close.length;
  }

  CLASS_SUFFIX_RE.lastIndex = end;
  const classMatch = CLASS_SUFFIX_RE.exec(text);
  if (classMatch) {
    node.classes.push(classMatch[1]);
    end = CLASS_SUFFIX_RE.lastIndex;
  }
  return { node, end };
};

/** Reads `A & B` at `position`. */
const readNodeList = (
  text: string,
  position: number
): { nodes: NodeRef[]; end: number } | undefined => {
  const nodes: NodeRef[] = [];
  let end = position;
  for (;;) {
    while (text[end] === ' ' || text[end] === '\t') end++;
    const read = readNode(text, end);
    if (!read) return undefined;
    nodes.push(read.node);
    end = read.end;
    const ampersand = /\s*&\s*/y;
    ampersand.lastIndex = end;
    if (!ampersand.exec(text)) return { nodes, end };
    end = ampersand.lastIndex;
  }
};

type LinkStyle = Omit<FlowchartEdge, 'source' | 'target'>;

const toLinkStyle = (
  backHead: string | undefined,
  line: string,
  head: string | undefined,
  label: string | undefined
): LinkStyle => {
  const cleaned = label !== undefined ? cleanLabel(label) : '';
  const hasHead = head === '>';
  return {
    ...(cleaned && { label: cleaned }),
    dotted: line.includes('.'),
    thick: line.includes('='),
    arrow: hasHead && backHead ? 'both' : hasHead ? 'forward' : 'none',
  };
};

const readLink = (text: string, position: number): { link: LinkStyle; end: number } | undefined => {
  TEXT_LINK_RE.lastIndex = position;
  const textMatch = TEXT_LINK_RE.exec(text);
  if (textMatch) {
    const [, back, open, label, close, head] = textMatch;
    return { link: toLinkStyle(back, open + close, head, label), end: TEXT_LINK_RE.lastIndex };
  }
  SIMPLE_LINK_RE.lastIndex = position;
  const simpleMatch = SIMPLE_LINK_RE.exec(text);
  if (simpleMatch) {
    const [, back, line, head, label] = simpleMatch;
    return { link: toLinkStyle(back, line, head, label), end: SIMPLE_LINK_RE.lastIndex };
  }
  return undefined;
};

/**
 * Parses a Mermaid flowchart. Returns `undefined` when the source is not a flowchart at all (no
 * `flowchart` or `graph` header); statements it cannot read are listed in `skipped`.
 */
export const parseMermaidFlowchart = (source: string): Flowchart | undefined => {
  const statements = splitStatements(source.replace(/^\s*```(?:mermaid)?\s*$/gim, ''))
    // Comments.
    .filter((statement) => !statement.startsWith('%%'));
  const header = statements.shift()?.match(HEADER_RE);
  if (!header) return undefined;

  const direction = (header[1] ?? 'TB').toUpperCase().replace('TD', 'TB') as FlowchartDirection;
  const nodes = new Map<string, FlowchartNode>();
  const edges: FlowchartEdge[] = [];
  const skipped: string[] = [];
  const groups: string[] = [];

  const declare = ({ id, label, shape, classes }: NodeRef): void => {
    const existing = nodes.get(id);
    if (existing) {
      if (label !== undefined) existing.label = label;
      if (shape !== undefined) existing.shape = shape;
      existing.classes.push(...classes.filter((name) => !existing.classes.includes(name)));
      return;
    }
    const group = groups[groups.length - 1];
    nodes.set(id, {
      id,
      label: label ?? id,
      shape: shape ?? 'rectangle',
      classes: [...classes],
      ...(group !== undefined && { group }),
    });
  };

  for (const statement of statements) {
    const subgraph = statement.match(SUBGRAPH_RE);
    if (subgraph) {
      const read = readNode(subgraph[1], 0);
      groups.push(read?.node.label ?? cleanLabel(subgraph[1]));
      continue;
    }
    if (statement === 'end') {
      groups.pop();
      continue;
    }
    const classStatement = statement.match(CLASS_STATEMENT_RE);
    if (classStatement) {
      for (const id of classStatement[1].split(',').map((part) => part.trim())) {
        declare({ id, classes: [classStatement[2]] });
      }
      continue;
    }
    if (IGNORED_STATEMENT_RE.test(statement)) continue;

    let read = readNodeList(statement, 0);
    if (!read) {
      skipped.push(statement);
      continue;
    }
    const chain: Array<{ nodes: NodeRef[]; link?: LinkStyle }> = [{ nodes: read.nodes }];
    let position = read.end;
    let complete = true;
    while (position < statement.length) {
      const link = readLink(statement, position);
      const next = link && readNodeList(statement, link.end);
      if (!link || !next) {
        complete = false;
        break;
      }
      chain.push({ nodes: next.nodes, link: link.link });
      position = next.end;
      read = next;
    }
    if (!complete) {
      skipped.push(statement);
      continue;
    }
    for (const { nodes: refs } of chain) refs.forEach(declare);
    for (let index = 1; index < chain.length; index++) {
      const { nodes: targets, link } = chain[index];
      if (!link) continue;
      for (const from of chain[index - 1].nodes) {
        for (const target of targets) {
          edges.push({ source: from.id, target: target.id, ...link });
        }
      }
    }
  }

  return { direction, nodes: [...nodes.values()], edges, skipped };
};
