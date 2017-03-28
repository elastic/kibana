/* eslint-disable */

const $searchInput = $('#expandableSearchInput');

// We have to sanitize pasted data into a contenteditable.
$searchInput.on('paste', e => {
  e.preventDefault();

  // If we're using jQuery, we need to dig in and get the original event. IE puts clipboardData
  // on the window.
  const data = (e.originalEvent || e).clipboardData || window.clipboardData;

  // Strip out all HTML by just getting the text.
  const text = data.getData('text');

  // Preserve whitespace because people can use it to organize parts of a query to make it easier
  // to understand.
  const encodedWhitespace = text.replace(/ /g, '&nbsp;');

  // Preserve line-breaks.
  const splitOnBreaks = encodedWhitespace.split(/\r?\n/g);
  const html = splitOnBreaks.join('<br>');

  document.execCommand('insertHTML', false, html);
});

$searchInput.on('blur', () => {
  // If the search input has been scrolled, we should make sure only the first line is visible
  // if it loses focus and collapses.
  $searchInput.scrollTop(0);
});
