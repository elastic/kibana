import expect from 'expect.js';
import ngMock from 'ng_mock';
import { pluck } from 'lodash';
import { IndicesGetIndicesProvider } from 'ui/indices/get_indices';

describe('GetIndices', function () {
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
    aliasesResponse = [
      { index: '.monitoring-es-active' }
    ];

    $provide.service('esAdmin', function () {
      return {
        cat: {
          indices: async () => indicesResponse,
          aliases: async () => aliasesResponse
        }
      };
    });
  }));

  beforeEach(ngMock.inject((Private) => {
    getIndices = Private(IndicesGetIndicesProvider);
  }));

  it('should be a function', function () {
    expect(getIndices).to.be.a(Function);
  });

  it('should get all indices', async function () {
    const indices = await getIndices();
    const expected = [...pluck(indicesResponse, 'index'), ...pluck(aliasesResponse, 'index')];

    expected.forEach((value, index) => {
      expect(value).to.be(indices[index]);
    });
    expect(indices).to.contain('.monitoring-es-active');
  });

  it('should handle no aliases', async function () {
    const aliasesResponseCopy = aliasesResponse.slice(0);
    aliasesResponse = {};
    const indices = await getIndices();
    expect(indices).to.not.contain('.monitoring-es-active');
    aliasesResponse = aliasesResponseCopy;
  });
});
