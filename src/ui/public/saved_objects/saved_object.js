import _ from 'lodash';

export class SavedObject {
  constructor(client, { id, type, version, attributes }) {
    this._client = client;
    this._id = id;
    this._type = type;
    this._attributes = attributes || {};
    this._version = version;
  }

  get(key) {
    return _.get(this._attributes, key);
  }

  set(key, value) {
    return _.set(this._attributes, key, value);
  }

  has(key) {
    return _.has(this._attributes, key);
  }

  save() {
    if (this._id) {
      return this._client.update(this.type, this.id, this._attributes);
    } else {
      return this._client.create(this.type, this._attributes);
    }
  }

  delete() {
    return this._client.delete(this.type, this.id);
  }
}
