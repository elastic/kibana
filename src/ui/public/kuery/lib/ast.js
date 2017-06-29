import grammar from 'raw!./kuery.peg';
import PEG from 'pegjs';
import _ from 'lodash';
import { nodeTypes } from './node_types';

const kueryParser = PEG.buildParser(grammar);

export function fromKueryExpression(expression) {
  if (_.isUndefined(expression)) {
    throw new Error('expression must be a string, got undefined instead');
  }

  return kueryParser.parse(expression);
}

export function toKueryExpression(node) {
  if (!node || !node.type) {
    return '';
  }

  return nodeTypes[node.type].toKueryExpression(node);
}

export function toElasticsearchQuery(node) {
  if (!node || !node.type) {
    return toElasticsearchQuery(nodeTypes.compound.buildNode({ children: [] }));
  }

  return nodeTypes[node.type].toElasticsearchQuery(node);
}

export function addNode(rootNode, newNode) {
  if (rootNode.type !== 'compound') {
    throw new Error('Nodes can only be added to compound nodes');
  }

  rootNode.params.children = [...rootNode.params.children, newNode];
  return rootNode;
}
