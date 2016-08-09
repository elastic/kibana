import _ from 'lodash';

export default function getVislibOptions(vis) {
  return _.assign(
    {},
    vis.type.params.defaults,
    {
      type: vis.type.name,
      // Add attribute which determines whether an index is time based or not.
      hasTimeField: vis.indexPattern && vis.indexPattern.hasTimeField()
    },
    vis.params
  );
}
