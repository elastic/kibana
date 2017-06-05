import expect from 'expect.js';
import { addSystemApiHeader, isSystemApiRequest } from '../system_api';

describe('system_api', () => {
  describe('#addSystemApiHeader', () => {
    it ('adds the correct system API header', () => {
      const headers = {
        'kbn-version': '4.6.0'
      };
      const newHeaders = addSystemApiHeader(headers);

      expect(newHeaders).to.have.property('kbn-system-api');
      expect(newHeaders['kbn-system-api']).to.be(true);

      expect(newHeaders).to.have.property('kbn-version');
      expect(newHeaders['kbn-version']).to.be('4.6.0');
    });
  });

  describe('#isSystemApiRequest', () => {
    it ('returns true for a system API HTTP request', () => {
      const mockRequest = {
        headers: {
          'kbn-system-api': true
        }
      };
      expect(isSystemApiRequest(mockRequest)).to.be(true);
    });

    it ('returns false for a non-system API HTTP request', () => {
      const mockRequest = {
        headers: {}
      };
      expect(isSystemApiRequest(mockRequest)).to.be(false);
    });
  });
});
