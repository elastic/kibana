def call(List<Closure> closures) {
  withTaskQueue.addTasks(closures)
}

def check() {
  tasks([
    kibanaPipeline.scriptTask('Quick Commit Checks', 'test/scripts/checks/commit/commit.sh'),
    kibanaPipeline.scriptTask('Check Telemetry Schema', 'test/scripts/checks/telemetry.sh'),
    kibanaPipeline.scriptTask('Check TypeScript Projects', 'test/scripts/checks/ts_projects.sh'),
    kibanaPipeline.scriptTask('Check Jest Configs', 'test/scripts/checks/jest_configs.sh'),
    kibanaPipeline.scriptTask('Check Doc API Changes', 'test/scripts/checks/doc_api_changes.sh'),
    kibanaPipeline.scriptTask('Check @kbn/pm Distributable', 'test/scripts/checks/kbn_pm_dist.sh'),
    kibanaPipeline.scriptTask('Check Plugin List Docs', 'test/scripts/checks/plugin_list_docs.sh'),
    kibanaPipeline.scriptTask('Check Types and Public API Docs', 'test/scripts/checks/type_check_plugin_public_api_docs.sh'),
    kibanaPipeline.scriptTask('Check Bundle Limits', 'test/scripts/checks/bundle_limits.sh'),
    kibanaPipeline.scriptTask('Check i18n', 'test/scripts/checks/i18n.sh'),
    kibanaPipeline.scriptTask('Check File Casing', 'test/scripts/checks/file_casing.sh'),
    kibanaPipeline.scriptTask('Check Licenses', 'test/scripts/checks/licenses.sh'),
    kibanaPipeline.scriptTask('Check Plugins With Circular Dependencies', 'test/scripts/checks/plugins_with_circular_deps.sh'),
    kibanaPipeline.scriptTask('Verify NOTICE', 'test/scripts/checks/verify_notice.sh'),
    kibanaPipeline.scriptTask('Test Projects', 'test/scripts/checks/test_projects.sh'),
    kibanaPipeline.scriptTask('Test Hardening', 'test/scripts/checks/test_hardening.sh'),
  ])
}

def lint() {
  tasks([
    kibanaPipeline.scriptTask('Lint: eslint', 'test/scripts/lint/eslint.sh'),
    kibanaPipeline.scriptTask('Lint: stylelint', 'test/scripts/lint/stylelint.sh'),
  ])
}

def test() {
  tasks([
    // This task requires isolation because of hard-coded, conflicting ports and such, so let's use Docker here
    kibanaPipeline.scriptTaskDocker('Jest Integration Tests', 'test/scripts/test/jest_integration.sh'),
    kibanaPipeline.scriptTask('API Integration Tests', 'test/scripts/test/api_integration.sh'),
  ])
}

def ossCiGroups() {
  def ciGroups = 1..11
  tasks(ciGroups.collect { kibanaPipeline.ossCiGroupProcess(it, true) })
}

def xpackCiGroups() {
  def ciGroups = 1..13
  tasks(ciGroups.collect { kibanaPipeline.xpackCiGroupProcess(it, true) })
}

def xpackCiGroupDocker() {
  task {
    workers.ci(name: 'xpack-cigroups-docker', size: 'm', ramDisk: true) {
      kibanaPipeline.downloadDefaultBuildArtifacts()
      kibanaPipeline.bash("""
        cd '${env.WORKSPACE}'
        mkdir -p kibana-build
        tar -xzf kibana-default.tar.gz -C kibana-build --strip=1
        tar -xzf kibana-default-plugins.tar.gz -C kibana
      """, "Extract Default Build artifacts")
      kibanaPipeline.xpackCiGroupProcess('Docker', true)()
    }
  }
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
    if (config.ciGroups) {
      ossCiGroups()
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
      task(kibanaPipeline.scriptTaskDocker('serverIntegration', './test/scripts/test/server_integration.sh'))
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
    if (config.ciGroups) {
      xpackCiGroups()
      xpackCiGroupDocker()
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
      'x-pack/plugins/cases/',
      'x-pack/plugins/timelines/',
      'x-pack/plugins/lists/',
      'x-pack/test/security_solution_cypress/',
      'x-pack/plugins/triggers_actions_ui/public/application/sections/action_connector_form/',
      'x-pack/plugins/triggers_actions_ui/public/application/context/actions_connectors_context.tsx',
    ]) {
      if (githubPr.isPr()) {
        task(kibanaPipeline.functionalTestProcess('xpack-securitySolutionCypressChrome', './test/scripts/jenkins_security_solution_cypress_chrome.sh'))
        // Temporarily disabled to figure out test flake
        // task(kibanaPipeline.functionalTestProcess('xpack-securitySolutionCypressFirefox', './test/scripts/jenkins_security_solution_cypress_firefox.sh'))
      }
    }

    whenChanged([
      'x-pack/plugins/apm/',
    ]) {
      if (githubPr.isPr()) {
        task(kibanaPipeline.functionalTestProcess('xpack-APMCypress', './test/scripts/jenkins_apm_cypress.sh'))
      }
    }

    whenChanged([
      'x-pack/plugins/uptime/',
    ]) {
      if (githubPr.isPr()) {
        task(kibanaPipeline.functionalTestProcess('xpack-UptimePlaywright', './test/scripts/jenkins_uptime_playwright.sh'))
      }
    }
    
    whenChanged([
      'x-pack/plugins/fleet/',
    ]) {
      if (githubPr.isPr()) {
        task(kibanaPipeline.functionalTestProcess('xpack-FleetCypress', './test/scripts/jenkins_fleet_cypress.sh'))
      }
    }

    whenChanged([
      'x-pack/plugins/osquery/',
    ]) {
      if (githubPr.isPr()) {
        task(kibanaPipeline.functionalTestProcess('xpack-osqueryCypress', './test/scripts/jenkins_osquery_cypress.sh'))
      }
    }

  }
}

def storybooksCi() {
  task {
    storybooks.buildAndUpload()
  }
}

return this
