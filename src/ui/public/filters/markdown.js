import MarkdownIt from 'markdown-it';
import { uiModules } from 'ui/modules';
import 'angular-sanitize';

const markdownIt = new MarkdownIt({
  html: false,
  linkify: true
});

uiModules
  .get('kibana', ['ngSanitize'])
  .filter('markdown', function ($sanitize) {
    return md => md ? $sanitize(markdownIt.render(md)) : '';
  });
