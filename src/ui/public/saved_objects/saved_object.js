import _ from 'lodash';

export class SavedObject {
  constructor(client, attributes) {
    this.client = client;
    this.attributes = attributes;
  }

  get(key) {
    return _.get(this.attributes, key);
  }

  set(key, value) {
    return _.set(this.attributes, key, value);
  }

  save() {
    if (this.id) {
      return this.client.update(this.type, this.id, this.attributes);
    } else {
      return this.client.create(this.type, this.attributes);
    }
  }

  delete() {
    return this.cient.delete(this.type, this.id);
  }

  get id() {
    return this.get('id');
  }

  get type() {
    return this.get('type');
  }
}
