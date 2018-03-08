import _ from 'lodash';
import { functions } from '../functions';

export function buildNode(functionName, ...functionArgs) {
  const kueryFunction = functions[functionName];

  if (_.isUndefined(kueryFunction)) {
    throw new Error(`Unknown function "${functionName}"`);
  }

  return {
    type: 'function',
    function: functionName,
    ...kueryFunction.buildNodeParams(...functionArgs)
  };
}

// Mainly only useful in the grammar where we'll already have real argument nodes in hand
export function buildNodeWithArgumentNodes(functionName, argumentNodes) {
  if (_.isUndefined(functions[functionName])) {
    throw new Error(`Unknown function "${functionName}"`);
  }

  return {
    type: 'function',
    function: functionName,
    arguments: argumentNodes,
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  const kueryFunction = functions[node.function];
  return kueryFunction.toElasticsearchQuery(node, indexPattern);
}

