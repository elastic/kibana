/* eslint-disable */

const $searchInput = $('#expandableSearchInput');
let multiLineInputValue = '(.es(\'"this&nbsp;&nbsp;&nbsp;&nbsp;"&nbsp;AND&nbsp;&nbsp;" that"&nbsp;&nbsp;\',&nbsp;metric=sum:bytes),&nbsp;.es(\'foo OR bar\')).divide(.es(-foo)).multiply(100).holt(0.1,0.1,0.1,1w),<br><br>.es(*).label(\'This is everything\')';

function formatMultiLineExpression(html) {
  // Preserve whitespace because people can use it to organize parts of a query to make it easier
  // to understand.
  const encodedWhitespace = html.replace(/ /g, '&nbsp;');

  // Replace divs with linebreaks.
  const removeClosingDivs = html.replace(/<\/div>/g, '');
  const breakOnOpeningDivs = removeClosingDivs.replace(/<div>/g, '<br>');

  // Preserve line-breaks.
  const splitOnBreaks = breakOnOpeningDivs.split(/\r?\n/g);
  return splitOnBreaks.join('<br>');
}

function formatSingleLineExpression(html) {
  // Allow whitespace to collapse.
  const encodedWhitespace = html.replace(/&nbsp;/g, ' ');

  // Replace divs with linebreaks.
  const removeClosingDivs = encodedWhitespace.replace(/<\/div>/g, '');
  const breakOnOpeningDivs = removeClosingDivs.replace(/<div>/g, '\n');

  // Preserve line-breaks.
  const splitOnBreaks = breakOnOpeningDivs.split(/<br>/g);
  return splitOnBreaks.join('\n');
}

// We have to sanitize pasted data into a contenteditable.
$searchInput.on('paste', e => {
  e.preventDefault();

  // If we're using jQuery, we need to dig in and get the original event. IE puts clipboardData
  // on the window.
  const data = (e.originalEvent || e).clipboardData || window.clipboardData;

  // Strip out all HTML by just getting the text.
  const text = data.getData('text');

  const html = formatMultiLineExpression(text);

  document.execCommand('insertHTML', false, html);
});

$searchInput.on('blur', () => {
  // If the search input has been scrolled, we should make sure only the first line is visible
  // if it loses focus and collapses.
  $searchInput.scrollTop(0);

  // Store input value.
  multiLineInputValue = formatMultiLineExpression($searchInput.html());

  // Display "preview mode" of input value.
  const previewInput = formatSingleLineExpression($searchInput.html());
  $searchInput.text(previewInput);
});

$searchInput.on('focus', () => {
  // Display true input value.
  $searchInput.html(multiLineInputValue);
});

// Init.
$searchInput.html(formatSingleLineExpression(multiLineInputValue));
