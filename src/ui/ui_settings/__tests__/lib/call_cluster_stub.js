import sinon from 'sinon';
import expect from 'expect.js';
import { merge } from 'lodash';

export function createCallClusterStub(index, type, id, esDocSource) {
  const currentEsDocValue = merge({}, esDocSource);

  const callCluster = sinon.spy(async (method, params) => {
    expect(params)
      .to.have.property('index', index)
      .and.to.have.property('type', type)
      .and.to.have.property('id', id);

    switch (method) {
      case 'get':
        return { _source: merge({}, currentEsDocValue) };

      case 'update':
        expect(params).to.have.property('body');
        expect(params.body).to.have.property('doc');
        merge(currentEsDocValue, params.body.doc);
        return {};

      default:
        throw new Error(`unexpected es method ${method}`);
    }
  });

  callCluster.assertGetQuery = () => {
    sinon.assert.calledOnce(callCluster);
    sinon.assert.calledWith(callCluster, 'get');
  };

  callCluster.assertUpdateQuery = doc => {
    sinon.assert.calledOnce(callCluster);
    expect(callCluster.firstCall.args).to.eql([
      'update',
      {
        index,
        type,
        id,
        body: { doc },
      }
    ]);
  };

  return callCluster;
}
