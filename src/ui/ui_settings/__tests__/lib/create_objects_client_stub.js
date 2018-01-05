import sinon from 'sinon';
import expect from 'expect.js';
import { SavedObjectsClient } from '../../../../server/saved_objects/client';

export const savedObjectsClientErrors = SavedObjectsClient.errors;

export function createObjectsClientStub(type, id, esDocSource = {}) {
  const savedObjectsClient = {
    update: sinon.stub(),
    get: sinon.stub().returns({ attributes: esDocSource }),
    create: sinon.stub(),
    errors: savedObjectsClientErrors
  };

  savedObjectsClient.assertGetQuery = () => {
    sinon.assert.calledOnce(savedObjectsClient.get);

    const { args } = savedObjectsClient.get.getCall(0);
    expect(args[0]).to.be(type);
    expect(args[1]).to.eql(id);
  };

  savedObjectsClient.assertUpdateQuery = (expectedChanges) => {
    sinon.assert.calledOnce(savedObjectsClient.update);

    const { args } = savedObjectsClient.update.getCall(0);
    expect(args[0]).to.be(type);
    expect(args[1]).to.eql(id);
    expect(args[2]).to.eql(expectedChanges);
  };

  return savedObjectsClient;
}
