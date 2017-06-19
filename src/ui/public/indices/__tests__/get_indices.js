import expect from 'expect.js';
import ngMock from 'ng_mock';
import { IndicesGetIndicesProvider } from 'ui/indices/get_indices';

describe('GetIndices', function () {
  let response;
  let getIndices;

  beforeEach(ngMock.module('kibana', ($provide) => {
    response = {
      '.monitoring-es-2': {
        aliases: {},
      },
      '.monitoring-es-3': {
        aliases: {
          '.monitoring-es-active' : { }
        },
      },
      '.monitoring-es-4': {
        aliases: {},
      },
      '.monitoring-es-5': {
        aliases: {},
      },
      '.kibana': {
        aliases: {},
      }
    };

    $provide.service('esAdmin', function () {
      return {
        indices: {
          getAlias: async function () {
            return response;
          }
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
    Object.keys(response).forEach(index => {
      expect(indices).to.contain(index);
    });
    expect(indices).to.contain('.monitoring-es-active');
  });
});
