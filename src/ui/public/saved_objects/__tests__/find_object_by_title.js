import sinon from 'sinon';
import expect from 'expect.js';
import { findObjectByTitle } from '../find_object_by_title';
import { SavedObject } from '../saved_object';

describe('findObjectByTitle', () => {
  const sandbox = sinon.sandbox.create();
  const savedObjectsClient = {};

  beforeEach(() => {
    savedObjectsClient.find = sandbox.stub();
  });

  afterEach(() => sandbox.restore());

  it('returns undefined if title is not provided', async () => {
    const match = await findObjectByTitle(savedObjectsClient, 'index-pattern');
    expect(match).to.be(undefined);
  });

  it('matches any case', async () => {
    const indexPattern = new SavedObject(savedObjectsClient, { attributes: { title: 'foo' } });
    savedObjectsClient.find.returns(Promise.resolve({
      savedObjects: [indexPattern]
    }));

    const match = await findObjectByTitle(savedObjectsClient, 'index-pattern', 'FOO');
    expect(match).to.eql(indexPattern);
  });
});
