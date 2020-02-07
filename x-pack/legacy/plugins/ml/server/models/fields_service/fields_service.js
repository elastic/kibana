/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Service for carrying out queries to obtain data
// specific to fields in Elasticsearch indices.

export function fieldsServiceProvider(callWithRequest) {
  // Obtains the cardinality of one or more fields.
  // Returns an Object whose keys are the names of the fields,
  // with values equal to the cardinality of the field.
  // Any of the supplied fieldNames which are not aggregatable will
  // be omitted from the returned Object.
  function getCardinalityOfFields(index, fieldNames, query, timeFieldName, earliestMs, latestMs) {
    // First check that each of the supplied fieldNames are aggregatable,
    // then obtain the cardinality for each of the aggregatable fields.
    return new Promise((resolve, reject) => {
      callWithRequest('fieldCaps', {
        index,
        fields: fieldNames,
      })
        .then(fieldCapsResp => {
          const aggregatableFields = [];
          fieldNames.forEach(fieldName => {
            const fieldInfo = fieldCapsResp.fields[fieldName];
            const typeKeys = fieldInfo !== undefined ? Object.keys(fieldInfo) : [];
            if (typeKeys.length > 0) {
              const fieldType = typeKeys[0];
              const isFieldAggregatable = fieldInfo[fieldType].aggregatable;
              if (isFieldAggregatable === true) {
                aggregatableFields.push(fieldName);
              }
            }
          });

          if (aggregatableFields.length > 0) {
            // Build the criteria to use in the bool filter part of the request.
            // Add criteria for the time range and the datafeed config query.
            const mustCriteria = [
              {
                range: {
                  [timeFieldName]: {
                    gte: earliestMs,
                    lte: latestMs,
                    format: 'epoch_millis',
                  },
                },
              },
            ];

            if (query) {
              mustCriteria.push(query);
            }

            const aggs = aggregatableFields.reduce((obj, field) => {
              obj[field] = { cardinality: { field } };
              return obj;
            }, {});

            const body = {
              query: {
                bool: {
                  must: mustCriteria,
                },
              },
              size: 0,
              _source: {
                excludes: [],
              },
              aggs,
            };

            callWithRequest('search', {
              index,
              body,
            })
              .then(resp => {
                const aggregations = resp.aggregations;
                if (aggregations !== undefined) {
                  const results = aggregatableFields.reduce((obj, field) => {
                    obj[field] = (aggregations[field] || { value: 0 }).value;
                    return obj;
                  }, {});
                  resolve(results);
                } else {
                  resolve({});
                }
              })
              .catch(resp => {
                reject(resp);
              });
          } else {
            // None of the fields are aggregatable. Return empty Object.
            resolve({});
          }
        })
        .catch(resp => {
          reject(resp);
        });
    });
  }

  function getTimeFieldRange(index, timeFieldName, query) {
    return new Promise((resolve, reject) => {
      const obj = { success: true, start: { epoch: 0, string: '' }, end: { epoch: 0, string: '' } };

      callWithRequest('search', {
        index,
        size: 0,
        body: {
          query,
          aggs: {
            earliest: {
              min: {
                field: timeFieldName,
              },
            },
            latest: {
              max: {
                field: timeFieldName,
              },
            },
          },
        },
      })
        .then(resp => {
          if (resp.aggregations && resp.aggregations.earliest && resp.aggregations.latest) {
            obj.start.epoch = resp.aggregations.earliest.value;
            obj.start.string = resp.aggregations.earliest.value_as_string;

            obj.end.epoch = resp.aggregations.latest.value;
            obj.end.string = resp.aggregations.latest.value_as_string;
          }
          resolve(obj);
        })
        .catch(resp => {
          reject(resp);
        });
    });
  }

  return {
    getCardinalityOfFields,
    getTimeFieldRange,
  };
}
