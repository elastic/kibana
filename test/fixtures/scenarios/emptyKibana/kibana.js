module.exports = [{
  'index': {
    '_index': '.kibana',
    '_type': 'config',
    '_id': require('../../../../package.json').version
  }
}, {
  'buildNum': require('../../../../package.json').build.number,
  'dateFormat:tz': 'UTC'
}];
