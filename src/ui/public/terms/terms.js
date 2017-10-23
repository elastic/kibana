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
  if (!_.get(field, 'aggregatable') || field.type !== 'string') {
    return Promise.resolve([]);
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
