import legacyKueryGrammar from 'raw-loader!./legacy_kuery.peg';
import kueryGrammar from 'raw-loader!./kuery.peg';
import PEG from 'pegjs';
import _ from 'lodash';
import { nodeTypes } from '../node_types/index';

const legacyKueryParser = PEG.buildParser(legacyKueryGrammar);
const kueryParser = PEG.buildParser(kueryGrammar, {
  allowedStartRules: ['start', 'Literal', 'WildcardString'],
});

export function fromLiteralExpression(expression, parseOptions) {
  parseOptions = {
    ...parseOptions,
    startRule: 'Literal',
  };

  return fromExpression(expression, parseOptions, kueryParser);
}

export function fromWildcardExpression(expression, parseOptions) {
  parseOptions = {
    ...parseOptions,
    startRule: 'WildcardString',
  };

  return fromExpression(expression, parseOptions, kueryParser);
}

export function fromLegacyKueryExpression(expression, parseOptions) {
  return fromExpression(expression, parseOptions, legacyKueryParser);
}

export function fromKueryExpression(expression, parseOptions) {
  return fromExpression(expression, parseOptions, kueryParser);
}

function fromExpression(expression, parseOptions = {}, parser = kueryParser) {
  if (_.isUndefined(expression)) {
    throw new Error('expression must be a string, got undefined instead');
  }

  parseOptions = {
    ...parseOptions,
    helpers: { nodeTypes }
  };

  return parser.parse(expression, parseOptions);
}

export function toElasticsearchQuery(node, indexPattern) {
  if (!node || !node.type || !nodeTypes[node.type]) {
    return toElasticsearchQuery(nodeTypes.function.buildNode('and', []));
  }

  return nodeTypes[node.type].toElasticsearchQuery(node, indexPattern);
}
