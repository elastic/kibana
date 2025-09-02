/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { of, throwError } from 'rxjs';
import { DocCountService } from './doc_count_service';

describe('DocCountService', () => {
  let mockDataStart: any;
  let onIndexSearchableMock: jest.Mock;
  let docCountService: DocCountService;

  beforeEach(() => {
    onIndexSearchableMock = jest.fn();
    mockDataStart = {
      search: {
        search: jest.fn(),
      },
    };
    docCountService = new DocCountService(mockDataStart, onIndexSearchableMock);
  });

  afterEach(() => {
    docCountService.destroy();
  });

  describe('for new index creation', () => {
    it('should return true when documents exist', (done) => {
      mockDataStart.search.search.mockReturnValue(
        of({
          rawResponse: {
            hits: {
              hits: [{ _id: '1' }], // Has documents
              total: 1,
            },
          },
        })
      );

      docCountService.start('test-index', false, 0);

      setTimeout(() => {
        expect(onIndexSearchableMock).toHaveBeenCalledWith('test-index');
        done();
      }, 1100); // Wait for timer
    });

    it('should return false when no documents exist', (done) => {
      mockDataStart.search.search.mockReturnValue(
        of({
          rawResponse: {
            hits: {
              hits: [], // No documents
              total: 0,
            },
          },
        })
      );

      docCountService.start('test-index', false, 0);

      setTimeout(() => {
        expect(onIndexSearchableMock).not.toHaveBeenCalled();
        done();
      }, 500);
    });
  });

  describe('for append operations', () => {
    it('should return true when document count increases by expected amount', (done) => {
      let callCount = 0;
      mockDataStart.search.search.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call - initial count
          return of({
            rawResponse: {
              hits: {
                hits: [],
                total: 100, // Initial count
              },
            },
          });
        } else {
          // Second call - after import
          return of({
            rawResponse: {
              hits: {
                hits: [],
                total: 110, // Increased by 10
              },
            },
          });
        }
      });

      docCountService.start('test-index', true, 10); // Expect 10 new docs

      setTimeout(() => {
        expect(onIndexSearchableMock).toHaveBeenCalledWith('test-index');
        done();
      }, 2100); // Wait for two timer cycles
    });

    it('should return false when document count has not increased enough', (done) => {
      let callCount = 0;
      mockDataStart.search.search.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          // First call - initial count
          return of({
            rawResponse: {
              hits: {
                hits: [],
                total: 100, // Initial count
              },
            },
          });
        } else {
          // Second call - insufficient increase
          return of({
            rawResponse: {
              hits: {
                hits: [],
                total: 105, // Only increased by 5, expected 10
              },
            },
          });
        }
      });

      docCountService.start('test-index', true, 10); // Expect 10 new docs

      setTimeout(() => {
        expect(onIndexSearchableMock).not.toHaveBeenCalled();
        done();
      }, 1500);
    });

    it('should handle total as object format', (done) => {
      let callCount = 0;
      mockDataStart.search.search.mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return of({
            rawResponse: {
              hits: {
                hits: [],
                total: { value: 100, relation: 'eq' }, // Object format
              },
            },
          });
        } else {
          return of({
            rawResponse: {
              hits: {
                hits: [],
                total: { value: 115, relation: 'eq' }, // Increased by 15
              },
            },
          });
        }
      });

      docCountService.start('test-index', true, 10); // Expect 10 new docs

      setTimeout(() => {
        expect(onIndexSearchableMock).toHaveBeenCalledWith('test-index');
        done();
      }, 2100);
    });
  });

  it('should handle search errors gracefully', () => {
    mockDataStart.search.search.mockReturnValue(throwError(() => new Error('Search failed')));

    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    docCountService.start('test-index', false, 0);

    setTimeout(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failure when polling for index searchability:',
        expect.any(Error)
      );
      consoleErrorSpy.mockRestore();
    }, 100);
  });

  it('should allow updating expected document count', (done) => {
    let callCount = 0;
    mockDataStart.search.search.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return of({
          rawResponse: {
            hits: {
              hits: [],
              total: 100,
            },
          },
        });
      } else {
        return of({
          rawResponse: {
            hits: {
              hits: [],
              total: 120, // Increased by 20
            },
          },
        });
      }
    });

    docCountService.start('test-index', true, 10); // Initially expect 10
    docCountService.updateExpectedDocCount(20); // Update to expect 20

    setTimeout(() => {
      expect(onIndexSearchableMock).toHaveBeenCalledWith('test-index');
      done();
    }, 2100);
  });
});