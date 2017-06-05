import sinon from 'sinon';
import expect from 'expect.js';

import {
  createReduceStream,
  createPromiseFromStreams,
  createListStream,
} from '../';

const promiseFromEvent = (name, emitter) =>
  new Promise(resolve => emitter.on(name, () => resolve(name)));

describe('reduceStream', () => {
  it('calls the reducer for each item provided', async () => {
    const stub = sinon.stub();
    await createPromiseFromStreams([
      createListStream([1,2,3]),
      createReduceStream(stub.returnsArg(1), 0)
    ]);
    sinon.assert.calledThrice(stub);
    expect(stub.firstCall.args).to.eql([0, 1, 'utf8']);
    expect(stub.secondCall.args).to.eql([1, 2, 'utf8']);
    expect(stub.thirdCall.args).to.eql([2, 3, 'utf8']);
  });

  it('provides the return value of the last iteration of the reducer', async () => {
    const result = await createPromiseFromStreams([
      createListStream('abcdefg'.split('')),
      createReduceStream((acc) => acc + 1, 0)
    ]);
    expect(result).to.be(7);
  });

  it('emits an error if an iteration fails', async () => {
    const reduce = createReduceStream((acc, i) => expect(i).to.be(1), 0);
    const errorEvent = promiseFromEvent('error', reduce);

    reduce.write(1);
    reduce.write(2);
    reduce.resume();
    await errorEvent;
  });

  it('stops calling the reducer if an iteration fails, emits no data', async () => {
    const reducer = sinon.spy((acc, i) => {
      if (i < 100) return acc + i;
      else throw new Error(i);
    });
    const reduce$ = createReduceStream(reducer, 0);

    const dataStub = sinon.stub();
    const errorStub = sinon.stub();
    reduce$.on('data', dataStub);
    reduce$.on('error', errorStub);
    const endEvent = promiseFromEvent('end', reduce$);

    reduce$.write(1);
    reduce$.write(2);
    reduce$.write(300);
    reduce$.write(400);
    reduce$.write(1000);
    reduce$.end();

    await endEvent;
    sinon.assert.calledThrice(reducer);
    sinon.assert.notCalled(dataStub);
    sinon.assert.calledOnce(errorStub);
  });
});
