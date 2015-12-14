var _ = require('lodash');
var url = require('url');

/**
* Converts a config and a pathname to a url
* @param {object} config A url config
*   example:
*   {
*      protocol: 'http',
*      hostname: 'localhost',
*      port: 9220
*   }
* @param {object} app The params to append
*   example:
*   {
*      pathname: 'app/kibana',
*      hash: '/discover'
*   }
* @return {string}
*/
module.exports = function getPage(config, app) {
  return url.format(_.assign(config, app));
};
