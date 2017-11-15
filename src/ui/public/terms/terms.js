import _ from 'lodash';
import axios from 'axios';
import chrome from 'ui/chrome';

const baseUrl = chrome.addBasePath('/api/kibana/suggestions/values');

const axiosInstance = axios.create({
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
    'kbn-xsrf': 'kibana',
  },
});

function getFieldQueryHash(field, query = '', size = 10) {
  return `${field.indexPattern.id}/${field.name}/${query}/${size}`;
}

function terms(field, query, size) {
  if (!_.get(field, 'aggregatable')) {
    return Promise.reject('Unable to execute terms aggregation on field that is not aggregatable');
  }
  if (field.type !== 'string' && query) {
    return Promise.reject(`Unable to filter terms aggregation on non-string field type. ${field.name} is of type ${field.type}`);
  }

  const params = {
    query,
    field: field.name,
    size: size
  };

  return axiosInstance.post(`${baseUrl}/${field.indexPattern.title}`, params)
    .then(response => response.data)
    .catch(() => []);
}

export const getTerms = _.memoize(terms, getFieldQueryHash);
