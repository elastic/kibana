import VisSchemasProvider from './schemas';

export default function VisTypeFactory(Private) {
  const VisTypeSchemas = Private(VisSchemasProvider);

  function VisType(opts) {
    opts = opts || {};

    this.name = opts.name;
    this.title = opts.title;
    this.responseConverter = opts.responseConverter;
    this.hierarchicalData = opts.hierarchicalData || false;
    this.icon = opts.icon;
    this.description = opts.description;
    this.schemas = opts.schemas || new VisTypeSchemas();
    this.params = opts.params || {};
    this.requiresSearch = opts.requiresSearch == null ? true : opts.requiresSearch; // Default to true unless otherwise specified
    this.fullEditor = opts.fullEditor == null ? false : opts.fullEditor;
    this.implementsRenderComplete = opts.implementsRenderComplete || false;

    if (!this.params.optionTabs) {
      this.params.optionTabs = [
        { name: 'options', title: 'Options', editor: this.params.editor }
      ];
    }
  }

  VisType.prototype.createRenderbot = function() {
    throw new Error('not implemented');
  };

  return VisType;
}
