import uiModules from 'ui/modules';
import _ from 'lodash';
import marked from 'marked';
marked.setOptions({
  gfm: true, // Github-flavored markdown
  sanitize: true // Sanitize HTML tags
});

uiModules.get('kibana')
  .service('tilemapSettings', function (config, tilemap, $sanitize) {

    //`tilemap` are settings from kibana.yml
    let url = tilemap.url;
    let options = tilemap.options;

    /**
     * todo: needs to be Joi-i-fied
     */

    /**
     * public API hook (used by X-plugins)
     */
    this.setOptions = function () {
      options = tilemap.options;
    };

    this.getOptions = function () {
      const attribution = $sanitize(marked(options.attribution));
      return _.assign({}, options, {attribution});
    };

    /**
     * public API hook (used by X-plugins)
     */
    this.setUrl = function (value) {
      url = value;
    };
    this.getUrl = function () {
      return url;
    };
  });
