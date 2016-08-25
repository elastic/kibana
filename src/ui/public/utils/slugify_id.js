import _ from 'lodash';
export default function (id) {
  if (id == null) return;

  const trans = {
    '/' : '-slash-',
    '\\?' : '-questionmark-',
    '\\&' : '-ampersand-',
    '=' : '-equal-',
    '%' : '-percent-'
  };
  _.each(trans, function (val, key) {
    const regex = new RegExp(key, 'g');
    id = id.replace(regex, val);
  });
  id = id.replace(/[\s]+/g, '-');
  id = id.replace(/[\-]+/g, '-');
  return id;
};
