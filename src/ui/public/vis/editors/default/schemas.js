import _ from 'lodash';
import { IndexedArray } from '../../../indexed_array';
import { AggParams } from '../../../agg_types/agg_params';

class Schemas {
  constructor(schemas) {

    _(schemas || [])
      .map((schema) => {
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
      .tap((schemas) => {
        this.all = new IndexedArray({
          index: ['name'],
          group: ['group'],
          immutable: true,
          initialSet: schemas
        });
      })
      .groupBy('group')
      .forOwn((group, groupName) => {
        this[groupName] = new IndexedArray({
          index: ['name'],
          immutable: true,
          initialSet: group
        });
      })
      .commit();
  }
}

export { Schemas };

