import marked from 'marked';
import uiModules from 'ui/modules';

marked.setOptions({
  gfm: true, // GitHub-flavored markdown
  sanitize: true // Sanitize HTML tags
});

uiModules
  .get('kibana')
  .filter('markdown', function ($sce) {
    return md => md ? $sce.trustAsHtml(marked(md)) : '';
  });
