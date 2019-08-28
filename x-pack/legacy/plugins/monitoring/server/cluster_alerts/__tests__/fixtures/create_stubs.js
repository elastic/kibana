import sinon from 'sinon';

export function createStubs(mockQueryResult, featureStub) {
  const callWithRequestStub = sinon.stub().returns(Promise.resolve(mockQueryResult));
  const getClusterStub = sinon.stub().returns({ callWithRequest: callWithRequestStub });
  const configStub = sinon.stub().returns({
    get: sinon.stub().withArgs('xpack.monitoring.cluster_alerts.enabled').returns(true)
  });
  return {
    callWithRequestStub,
    mockReq: {
      server: {
        config: configStub,
        plugins: {
          monitoring: {
            info: {
              feature: featureStub
            }
          },
          elasticsearch: {
            getCluster: getClusterStub
          }
        }
      }
    }
  };
};
