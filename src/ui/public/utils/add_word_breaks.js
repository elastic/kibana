define(function () {
  return function addWordBreaks(text, minLineLength) {
    text = text || '';
    var lineSize = 0;
    var newText = '';
    var inHtmlTag = false;
    var inHtmlChar = false;

    for (var i = 0, len = text.length; i < len; i++) {
      var chr = text.charAt(i);
      newText += chr;

      switch (chr) {
        case ' ':
        case ':':
        case ',':
          // natural line break, reset line size
          lineSize = 0;
          break;
        case '<':
          inHtmlTag = true;
          break;
        case '>':
          inHtmlTag = false;
          lineSize = 0;
          break;
        case '&':
          inHtmlChar = true;
          break;
        case ';':
          inHtmlChar = false;
          lineSize = 0;
          break;
        default:
          if (!inHtmlTag && !inHtmlChar) lineSize++;
          break;
      }

      if (lineSize > minLineLength) {
        // continuous text is longer then we want,
        // so break it up with a <wbr>
        lineSize = 0;
        newText += '<wbr>';
      }
    }

    return newText;
  };
});
