import expect from 'expect.js';
import ngMock from 'ng_mock';
import { IndicesGetIndicesProvider } from 'ui/indices/get_indices';

function NotFoundError() {
  this.status = 404;
}

describe('GetIndices', function () {
  let throwOther = false;
  let throw404 = false;
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
            if (throw404) {
              throw new NotFoundError();
            }
            if (throwOther) {
              throw new Error();
            }
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

  it('should suppress a 404 response', async function () {
    throw404 = true;
    const indices = await getIndices();
    expect(indices.length).to.be(0);
    throw404 = false;
  });

  it('should not suppress a non 404 response', async function () {
    throwOther = true;

    let errorThrown = false;
    try {
      await getIndices();
    } catch (e) {
      errorThrown = true;
    }
    expect(errorThrown).to.be(true);
    throwOther = false;
  });
});
