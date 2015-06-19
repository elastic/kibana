var Kibana = require('../../');
var devStatics = require('./dev_statics');

module.exports = function (settings) {
  var kibana = new Kibana(settings || {}, [devStatics]);
  return kibana.listen();
};


if (require.main === module) {
  module.exports();
}
