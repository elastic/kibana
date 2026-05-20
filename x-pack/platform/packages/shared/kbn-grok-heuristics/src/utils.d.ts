import type { GrokPatternNode, NamedFieldNode, LiteralValueNode } from './types';
export declare function isNamedField(node: GrokPatternNode): node is NamedFieldNode;
export declare function isLiteralValue(node: GrokPatternNode): node is LiteralValueNode;
