export default function escapeAttribute(attr) {
  const specials = ['#', '&', '~', '=', '>', '\'', ':', '"', '!', ';', ','];
  const regexSpecials = ['.', '*', '+', '|', '[', ']', '(', ')', '/', '^', '$'];
  const sRE = new RegExp('(' + specials.join('|') + '|\\' + regexSpecials.join('|\\') + ')', 'g');

  return attr.replace(sRE, '\\$1');
}
