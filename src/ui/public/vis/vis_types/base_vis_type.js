import { CATEGORY } from '../vis_category';
import _ from 'lodash';

export function VisTypeProvider() {
  class VisType {

    constructor(opts) {
      opts = opts || {};

      if (!opts.name) throw('vis_type must define its name');
      if (!opts.title) throw('vis_type must define its title');
      if (!opts.description) throw('vis_type must define its description');
      if (!opts.icon && !opts.image) throw('vis_type must define its icon or image');
      if (!opts.visualization) throw('vis_type must define visualization controller');

      const _defaults = {
        // name, title, description, icon, image
        category: CATEGORY.OTHER,
        visualization: null,       // must be a class with render/resize/destroy methods
        visConfig: {
          defaults: {},            // default configuration
        },
        requestHandler: 'courier',    // select one from registry or pass a function
        responseHandler: 'tabify',
        editor: 'default',
        editorConfig: {
          collections: {},         // collections used for configuration (list of positions, ...)
        },
        options: {                // controls the visualize editor
          showTimePicker: true,
          showQueryBar: true,
          showFilterBar: true,
          showIndexSelection: true,
          hierarchicalData: false  // we should get rid of this i guess ?
        },
        stage: 'production',
        feedbackMessage: ''
      };

      _.defaultsDeep(this, opts, _defaults);

      this.requiresSearch = !(this.requestHandler === 'none');
    }

    shouldMarkAsExperimentalInUI() {
      //we are not making a distinction in the UI if a plugin is experimental and/or labs.
      //we just want to indicate it is special. the current flask icon is sufficient for that.
      return this.stage === 'experimental' || this.stage === 'lab';
    }
  }

  Object.defineProperty(VisType.prototype, 'schemas', {
    get() {
      if (this.editorConfig && this.editorConfig.schemas) {
        return this.editorConfig.schemas;
      }

      return []; //throw `Can't get schemas from a visualization without using the default editor`;
    }
  });

  return VisType;
}
