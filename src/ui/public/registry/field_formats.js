import _ from 'lodash';
import chrome from 'ui/chrome';
import { FieldFormat } from '../../field_formats/field_format';
import { IndexedArray } from 'ui/indexed_array';

class FieldFormatRegistry extends IndexedArray {
  constructor(config) {
    const spec = config && config.spec;
    const iaOpts = _.defaults(_.pick(spec, IndexedArray.OPT_NAMES), { index: ['id'] });
    super(iaOpts);

    this._config = chrome.getUiSettingsClient();
    this.getConfig = (...args) => this._config.get(...args);
    this._defaultMap = [];
    this._providers = [];
    this.init();
  }

  init() {
    this.parseDefaultTypeMap(this._config.get('format:defaultTypeMap'));

    this._config.subscribe(({ key, newValue }) => {
      if (key === 'format:defaultTypeMap') {
        this.parseDefaultTypeMap(newValue);
      }
    });
  }

  /**
   * Get the id of the default type for this field type
   * using the format:defaultTypeMap config map
   *
   * @param  {String} fieldType - the field type
   * @return {String}
   */
  getDefaultConfig = (fieldType) => {
    return this._defaultMap[fieldType] || this._defaultMap._default_;
  };

  /**
   * Get a FieldFormat type (class) by it's id.
   *
   * @param  {String} formatId - the format id
   * @return {Function}
   */
  getType = (formatId) => {
    return this.byId[formatId];
  };

  /**
   * Get the default FieldFormat type (class) for
   * a field type, using the format:defaultTypeMap.
   *
   * @param  {String} fieldType
   * @return {Function}
   */
  getDefaultType = (fieldType) => {
    return this.byId[this.getDefaultConfig(fieldType).id];
  };

  /**
   * Get the singleton instance of the FieldFormat type by it's id.
   *
   * @param  {String} formatId
   * @return {FieldFormat}
   */
  getInstance = _.memoize(function (formatId) {
    const FieldFormat = this.byId[formatId];
    return new FieldFormat(null, this.getConfig);
  });

  /**
   * Get the default fieldFormat instance for a field format.
   *
   * @param  {String} fieldType
   * @return {FieldFormat}
   */
  getDefaultInstance = _.memoize(function (fieldType) {
    const conf = this.getDefaultConfig(fieldType);
    const FieldFormat = this.byId[conf.id];
    return new FieldFormat(conf.params, this.getConfig);
  });


  parseDefaultTypeMap(value) {
    this._defaultMap = value;
    _.forOwn(this, function (fn) {
      if (_.isFunction(fn) && fn.cache) {
        // clear all memoize caches
        fn.cache = new _.memoize.Cache();
      }
    });
  }

  name = 'fieldFormats';
  index = [ 'id' ];
  group = [ 'fieldType' ];
  displayName = '[registry ' + this.name + ']';

  register = (module) => {
    this.push(module(FieldFormat));
    return this;
  };
}

export const registryFieldFormats = new FieldFormatRegistry();
