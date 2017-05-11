import { VisSchemasProvider } from './schemas';
import _ from 'lodash';


export function VisVisTypeProvider(Private) {
  const VisTypeSchemas = Private(VisSchemasProvider);

  class VisType {
    constructor(opts) {
      opts = opts || {};

      const _defaults = {
        // name, title, description, icon, image
        category: VisType.CATEGORY.OTHER,
        visController: null,       // must be a function (or object with render/resize/update?)
        visConfig: {
          defaults: {},            // default configuration
          template: '',           // angular vis type requires template html
        },
        requestHandler: 'courier',    // select one from registry or pass a function
        responseHandler: 'none',      // ...
        editorController: 'default',  // ...
        editorConfig: {
          //optionTabs: {},          // default editor needs a list of option tabs
          optionsTemplate: '',      // default editor needs an optionsTemplate if optionsTab is not provided
          collections: {},         // collections used for configuration (list of positions, ...)
        },
        options: {                // controls the visualize editor
          showTimePicker: true,
          showQueryBar: true,
          showFilterBar: true,
          hierarchicalData: false  // we should get rid of this i guess ?
        },
        schemas: new VisTypeSchemas(),            // default editor needs a list of schemas ...
        isExperimental: false
      };

      _.defaultsDeep(this, opts, _defaults);

      if (!this.name) throw('vis_type must define its name');
      if (!this.title) throw('vis_type must define its title');
      if (!this.description) throw('vis_type must define its description');
      if (!this.icon && !this.image) throw('vis_type must define its icon or image');

      if (!this.editorConfig.optionTabs) {
        this.editorConfig.optionTabs = [
          { name: 'options', title: 'Options', editor: this.editorConfig.optionsTemplate }
        ];
      }

      this.requiresSearch = !(this.requestHandler === 'none');
    }

    render() {
      throw new Error('vis_type render function not implemented');
    }

    destroy() {

    }
  }

  VisType.CATEGORY = {
    BASIC: 'basic',
    DATA: 'data',
    MAP: 'map',
    OTHER: 'other',
    TIME: 'time',
  };

  return VisType;
}
