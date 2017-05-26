import sinon from 'sinon';
import expect from 'expect.js';
import { SavedObject } from '../saved_object';

describe('SavedObject', () => {
  it('persists type and id', () => {
    const id = 'logstash-*';
    const type = 'index-pattern';

    const client = sinon.stub();
    const savedObject = new SavedObject(client, { id, type });

    expect(savedObject.id).to.be(id);
    expect(savedObject.type).to.be(type);
  });

  it('persists attributes', () => {
    const attributes = { title: 'My title' };

    const client = sinon.stub();
    const savedObject = new SavedObject(client, { attributes });

    expect(savedObject._attributes).to.be(attributes);
  });

  it('persists version', () => {
    const version = 2;

    const client = sinon.stub();
    const savedObject = new SavedObject(client, { version });

    expect(savedObject._version).to.be(version);
  });
});
