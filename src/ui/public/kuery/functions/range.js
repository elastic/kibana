import _ from 'lodash';
import { nodeTypes } from '../node_types';
import * as ast from '../ast';
import { getRangeScript } from '../../filter_manager/lib/range';
import { getFields } from './utils/get_fields';

export function buildNodeParams(fieldName, params) {
  params = _.pick(params, 'gt', 'lt', 'gte', 'lte', 'format');
  const fieldNameArg = typeof fieldName === 'string' ? ast.fromLiteralExpression(fieldName) : nodeTypes.literal.buildNode(fieldName);
  const args = _.map(params, (value, key) => {
    return nodeTypes.namedArg.buildNode(key, value);
  });

  return {
    arguments: [fieldNameArg, ...args],
  };
}

export function toElasticsearchQuery(node, indexPattern) {
  const [ fieldNameArg, ...args ] = node.arguments;
  const fields = getFields(fieldNameArg, indexPattern);
  const namedArgs = extractArguments(args);
  const queryParams = _.mapValues(namedArgs, ast.toElasticsearchQuery);

  // If no fields are found in the index pattern we send through the given field name as-is. We do this to preserve
  // the behaviour of lucene on dashboards where there are panels based on different index patterns that have different
  // fields. If a user queries on a field that exists in one pattern but not the other, the index pattern without the
  // field should return no results. It's debatable whether this is desirable, but it's been that way forever, so we'll
  // keep things familiar for now.
  if (fields && fields.length === 0) {
    fields.push({
      name: ast.toElasticsearchQuery(fieldNameArg),
      scripted: false,
    });
  }


  const queries = fields.map((field) => {
    if (field.scripted) {
      return {
        script: {
          ...getRangeScript(field, queryParams)
        }
      };
    }

    return {
      range: {
        [field.name]: queryParams
      }
    };
  });

  return {
    bool: {
      should: queries,
      minimum_should_match: 1
    }
  };
}

function extractArguments(args) {
  if ((args.gt && args.gte) || (args.lt && args.lte)) {
    throw new Error('range ends cannot be both inclusive and exclusive');
  }

  const unnamedArgOrder = ['gte', 'lte', 'format'];

  return args.reduce((acc, arg, index) => {
    if (arg.type === 'namedArg') {
      acc[arg.name] = arg.value;
    }
    else {
      acc[unnamedArgOrder[index]] = arg;
    }

    return acc;
  }, {});
}
