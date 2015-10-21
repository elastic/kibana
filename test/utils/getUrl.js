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
* @param {string} pathname The requested path
* @return {string}
*/
module.exports = function getPage(config, pathname) {
  return url.format(_.assign(config, {
    pathname: pathname
  }));
};
