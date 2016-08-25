import _ from 'lodash';
// given an object or array of objects, return the value of the passed param
// if the param is missing, return undefined
export default function findByParam(values, param) {
  if (_.isArray(values)) { // point series chart
    const index = _.findIndex(values, param);
    if (index === -1) return;
    return values[index][param];
  }
  return values[param]; // pie chart
}