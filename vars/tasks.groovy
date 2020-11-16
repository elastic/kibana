def call(List<Closure> closures) {
  withTaskQueue.addTasks(closures)
}

def check() {
  tasks([
    kibanaPipeline.scriptTask('Quick Commit Checks', 'test/scripts/checks/commit.sh'),
    kibanaPipeline.scriptTask('Check Telemetry Schema', 'test/scripts/checks/telemetry.sh'),
    kibanaPipeline.scriptTask('Check TypeScript Projects', 'test/scripts/checks/ts_projects.sh'),
    kibanaPipeline.scriptTask('Check Doc API Changes', 'test/scripts/checks/doc_api_changes.sh'),
    kibanaPipeline.scriptTask('Check Types', 'test/scripts/checks/type_check.sh'),
    kibanaPipeline.scriptTask('Check Bundle Limits', 'test/scripts/checks/bundle_limits.sh'),
    kibanaPipeline.scriptTask('Check i18n', 'test/scripts/checks/i18n.sh'),
    kibanaPipeline.scriptTask('Check File Casing', 'test/scripts/checks/file_casing.sh'),
    kibanaPipeline.scriptTask('Check Licenses', 'test/scripts/checks/licenses.sh'),
    kibanaPipeline.scriptTask('Verify NOTICE', 'test/scripts/checks/verify_notice.sh'),
    kibanaPipeline.scriptTask('Test Projects', 'test/scripts/checks/test_projects.sh'),
    kibanaPipeline.scriptTask('Test Hardening', 'test/scripts/checks/test_hardening.sh'),
  ])
}

def lint() {
  tasks([
    kibanaPipeline.scriptTask('Lint: eslint', 'test/scripts/lint/eslint.sh'),
    kibanaPipeline.scriptTask('Lint: sasslint', 'test/scripts/lint/sasslint.sh'),
  ])
}

def test() {
  tasks([
    // These 2 tasks require isolation because of hard-coded, conflicting ports and such, so let's use Docker here
    kibanaPipeline.scriptTaskDocker('Jest Integration Tests', 'test/scripts/test/jest_integration.sh'),
    kibanaPipeline.scriptTaskDocker('Mocha Tests', 'test/scripts/test/mocha.sh'),

    kibanaPipeline.scriptTask('Jest Unit Tests', 'test/scripts/test/jest_unit.sh'),
    kibanaPipeline.scriptTask('API Integration Tests', 'test/scripts/test/api_integration.sh'),
    kibanaPipeline.scriptTask('X-Pack SIEM cyclic dependency', 'test/scripts/test/xpack_siem_cyclic_dependency.sh'),
    kibanaPipeline.scriptTask('X-Pack List cyclic dependency', 'test/scripts/test/xpack_list_cyclic_dependency.sh'),
    kibanaPipeline.scriptTask('X-Pack Jest Unit Tests', 'test/scripts/test/xpack_jest_unit.sh'),
  ])
}

def functionalOss(Map params = [:]) {
  def config = params ?: [
    serverIntegration: true,
    ciGroups: true,
    firefox: true,
    accessibility: true,
    pluginFunctional: true,
    visualRegression: false,
  ]

  task {
    kibanaPipeline.buildOss(6)

    if (config.ciGroups) {
      def ciGroups = 1..12
      tasks(ciGroups.collect { kibanaPipeline.ossCiGroupProcess(it) })
    }

    if (config.firefox) {
      task(kibanaPipeline.functionalTestProcess('oss-firefox', './test/scripts/jenkins_firefox_smoke.sh'))
    }

    if (config.accessibility) {
      task(kibanaPipeline.functionalTestProcess('oss-accessibility', './test/scripts/jenkins_accessibility.sh'))
    }

    if (config.pluginFunctional) {
      task(kibanaPipeline.functionalTestProcess('oss-pluginFunctional', './test/scripts/jenkins_plugin_functional.sh'))
    }

    if (config.visualRegression) {
      task(kibanaPipeline.functionalTestProcess('oss-visualRegression', './test/scripts/jenkins_visual_regression.sh'))
    }

    if (config.serverIntegration) {
      task(kibanaPipeline.scriptTaskDocker('serverIntegration', './test/scripts/server_integration.sh'))
    }
  }
}

def functionalXpack(Map params = [:]) {
  def config = params ?: [
    ciGroups: true,
    firefox: true,
    accessibility: true,
    pluginFunctional: true,
    savedObjectsFieldMetrics:true,
    pageLoadMetrics: false,
    visualRegression: false,
  ]

  task {
    kibanaPipeline.buildXpack(10)

    if (config.ciGroups) {
      def ciGroups = 1..10
      tasks(ciGroups.collect { kibanaPipeline.xpackCiGroupProcess(it) })
    }

    if (config.firefox) {
      task(kibanaPipeline.functionalTestProcess('xpack-firefox', './test/scripts/jenkins_xpack_firefox_smoke.sh'))
    }

    if (config.accessibility) {
      task(kibanaPipeline.functionalTestProcess('xpack-accessibility', './test/scripts/jenkins_xpack_accessibility.sh'))
    }

    if (config.visualRegression) {
      task(kibanaPipeline.functionalTestProcess('xpack-visualRegression', './test/scripts/jenkins_xpack_visual_regression.sh'))
    }

    if (config.savedObjectsFieldMetrics) {
      task(kibanaPipeline.functionalTestProcess('xpack-savedObjectsFieldMetrics', './test/scripts/jenkins_xpack_saved_objects_field_metrics.sh'))
    }

    whenChanged([
      'x-pack/plugins/security_solution/',
      'x-pack/test/security_solution_cypress/',
      'x-pack/plugins/triggers_actions_ui/public/application/sections/action_connector_form/',
      'x-pack/plugins/triggers_actions_ui/public/application/context/actions_connectors_context.tsx',
    ]) {
      task(kibanaPipeline.functionalTestProcess('xpack-securitySolutionCypress', './test/scripts/jenkins_security_solution_cypress.sh'))
    }
  }
}

return this
