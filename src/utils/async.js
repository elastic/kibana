let { all } = require('bluebird');

exports.each = async (arr, fn) => {
  await all(arr.map(fn)).return(undefined);
};

exports.map = async (arr, fn) => {
  await all(arr.map(fn));
};
