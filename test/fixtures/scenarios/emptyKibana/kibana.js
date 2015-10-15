module.exports = [{
  'index': {
    '_index': '.kibana',
    '_type': 'config'
  }
}, {
  'index': '.kibana',
  'body': {
    'buildNum': '@@buildNum'
  },
  'id': '@@version'
}];
