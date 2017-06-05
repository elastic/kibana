import marked from 'marked';
import { uiModules } from 'ui/modules';
import 'angular-sanitize';

marked.setOptions({
  gfm: true, // GitHub-flavored markdown
  sanitize: true // Sanitize HTML tags
});

uiModules
  .get('kibana', ['ngSanitize'])
  .filter('markdown', function ($sanitize) {
    return md => md ? $sanitize(marked(md)) : '';
  });
