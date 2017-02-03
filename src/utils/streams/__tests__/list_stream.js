import expect from 'expect.js';
import sinon from 'sinon';

import { createListStream } from '../';

describe('listStream', () => {
  it('provides the values in the initial list', async () => {
    const str = createListStream([1,2,3,4]);
    const stub = sinon.stub();
    str.on('data', stub);

    await new Promise(resolve => str.on('end', resolve));

    sinon.assert.callCount(stub, 4);
    expect(stub.getCall(0).args).to.eql([1]);
    expect(stub.getCall(1).args).to.eql([2]);
    expect(stub.getCall(2).args).to.eql([3]);
    expect(stub.getCall(3).args).to.eql([4]);
  });

  it('does not modify the list passed', async () => {
    const list = [1,2,3,4];
    const str = createListStream(list);
    str.resume();
    await new Promise(resolve => str.on('end', resolve));
    expect(list).to.eql([1,2,3,4]);
  });
});
