import VisSchemasProvider from 'ui/vis/schemas';

export default function VisTypeFactory(Private) {
  let VisTypeSchemas = Private(VisSchemasProvider);

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
  }

  return VisType;
};
