import expect from 'expect.js';
import ngMock from 'ng_mock';
import sinon from 'sinon';

import { IndicesGetIndicesProvider } from 'ui/indices/get_indices';
import { IndicesApiClientProvider } from 'ui/indices/indices_api_client_provider';

describe('GetIndices', function () {
  const searchSpy = sinon.spy();
  let indicesResponse;
  let aliasesResponse;
  let getIndices;

  beforeEach(ngMock.module('kibana', ($provide) => {
    indicesResponse = [
      { index: '.kibana' },
      { index: '.monitoring-es-2' },
      { index: '.monitoring-es-3' },
      { index: '.monitoring-es-4' },
      { index: '.monitoring-es-5' }
    ];
    aliasesResponse = {
      '.monitoring-es-1': {
        aliases: {
          '.monitoring-es-active': {}
        }
      }
    };

    $provide.service('esAdmin', function () {
      return {
        cat: {
          indices: async () => indicesResponse
        },
        indices: {
          getAlias: async () => aliasesResponse
        }
      };
    });
  }));

  beforeEach(ngMock.inject((Private) => {
    getIndices = Private(IndicesGetIndicesProvider);
    const provider = Private(IndicesApiClientProvider);
    provider.search = searchSpy;
  }));

  it('should be a function', function () {
    expect(getIndices).to.be.a(Function);
  });

  it('should call the indices api client', async function () {
    await getIndices('foo', 12, false);
    expect(searchSpy.calledWith({
      pattern: 'foo',
      maxNumberOfMatchingIndices: 12,
      useDataCluster: false
    })).to.be(true);
  });
});
