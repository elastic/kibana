import _ from 'lodash';
import IndexedArray from 'ui/indexed_array';
import AggTypesAggParamsProvider from 'ui/agg_types/agg_params';
export default function VisTypeSchemasFactory(Private) {
  const AggParams = Private(AggTypesAggParamsProvider);

  function Schemas(schemas) {
    const self = this;

    _(schemas || [])
    .map(function (schema) {
      if (!schema.name) throw new Error('all schema must have a unique name');

      if (schema.name === 'split') {
        schema.params = [
          {
            name: 'row',
            default: true
          }
        ];
        schema.editor = require('plugins/kbn_vislib_vis_types/controls/rows_or_columns.html');
      } else if (schema.name === 'radius') {
        schema.editor = require('plugins/kbn_vislib_vis_types/controls/radius_ratio_option.html');
      }

      _.defaults(schema, {
        min: 0,
        max: Infinity,
        group: 'buckets',
        title: schema.name,
        aggFilter: '*',
        editor: false,
        params: [],
        deprecate: false
      });

      // convert the params into a params registry
      schema.params = new AggParams(schema.params);

      return schema;
    })
    .tap(function (schemas) {
      self.all = new IndexedArray({
        index: ['name'],
        group: ['group'],
        immutable: true,
        initialSet: schemas
      });
    })
    .groupBy('group')
    .forOwn(function (group, groupName) {
      self[groupName] = new IndexedArray({
        index: ['name'],
        immutable: true,
        initialSet: group
      });
    })
    .commit();
  }

  return Schemas;
}
