import { VisSchemasProvider } from '../editors/default/schemas';
import { CATEGORY } from '../vis_category';
import _ from 'lodash';


export function VisTypeProvider(Private) {
  const VisTypeSchemas = Private(VisSchemasProvider);

  class VisType {
    constructor(opts) {
      opts = opts || {};

      //todo: clean this up!
      if (opts.schemas && !opts.editorConfig) {
        throw 'can\'t configure schemas without using default-editor';
      }

      if (opts.editorConfig && opts.schemas) {
        throw 'should configure schemas on the editorConfig object, not the top-level options';
      }

      const _defaults = {
        // name, title, description, icon, image
        category: CATEGORY.OTHER,
        visualization: null,       // must be a class with render/resize/destroy methods
        visConfig: {
          defaults: {},            // default configuration
        },
        requestHandler: 'courier',    // select one from registry or pass a function
        responseHandler: 'none',      // ...
        editor: 'default',
        editorConfig: {
          //optionTabs: {},          // default editor needs a list of option tabs
          optionsTemplate: '',      // default editor needs an optionsTemplate if optionsTab is not provided
          collections: {},         // collections used for configuration (list of positions, ...)
          schemas: new VisTypeSchemas()            // default editor needs a list of schemas ...
        },
        options: {                // controls the visualize editor
          showTimePicker: true,
          showQueryBar: true,
          showFilterBar: true,
          hierarchicalData: false  // we should get rid of this i guess ?
        },
        isExperimental: false
      };


      //todo: validate options here, not later
      _.defaultsDeep(this, opts, _defaults);

      //todo: move validation up to options object, not after we already create
      if (!this.name) throw('vis_type must define its name');
      if (!this.title) throw('vis_type must define its title');
      if (!this.description) throw('vis_type must define its description');
      if (!this.icon && !this.image) throw('vis_type must define its icon or image');
      if (typeof this.visualization !== 'function') throw('vis_type must define visualization controller');

      if (!this.editorConfig.optionTabs) {
        this.editorConfig.optionTabs = [
          { name: 'options', title: 'Options', editor: this.editorConfig.optionsTemplate }
        ];
      }

      this.requiresSearch = !(this.requestHandler === 'none');
    }
  }


  Object.defineProperty(VisType.prototype, 'schemas', {
    get() {
      if (this.editorConfig && this.editorConfig.schemas) {
        return this.editorConfig.schemas;
      }

      throw `Can't get schemas from a visualization without using the default editor`;
    }
  });

  return VisType;
}
