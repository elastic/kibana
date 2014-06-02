module.exports = function (config) {
  return {
    // copy source to temp, we will minify in place for the dist build
    dev_marvel_config: {
      options: {
        patterns: [
          {
            match: 'port',
            replacement: '<%= esPort.dev %>',
          },
          {
            match: 'stats_report_url',
            replacement: '<%= statsReportUrl.dev %>',
          },
          {
            match: 'registration_url',
            replacement: '<%= registrationUrl.dev %>',
          },
          {
            match: 'purchase_confirmation_url',
            replacement: '<%= purchaseConfirmationUrl.dev %>',
          },
          {
            match: 'ga_tracking_code',
            replacement: '<%= ga_tracking_code.dev %>',
          }
        ]
      },
      files: [
        {expand: true, flatten: true, src: ['./kibana/config.js'], dest: '<%= buildTempDir %>'},
        {expand: true, flatten: true, src: ['./common/analytics.js'], dest: '<%= buildTempDir %>/common/'},
        {expand: true, flatten: true, src: ['./common/PhoneHome.js'], dest: '<%= buildTempDir %>/common/'}
      ]
    },
    dist_marvel_config: {
      options: {
        patterns: [
          {
            match: 'port',
            replacement: '<%= esPort.dist %>',
          },
          {
            match: 'stats_report_url',
            replacement: '<%= statsReportUrl.dist %>',
          },
          {
            match: 'registration_url',
            replacement: '<%= registrationUrl.dist %>',
          },
          {
            match: 'purchase_confirmation_url',
            replacement: '<%= purchaseConfirmationUrl.dist %>',
          },
          {
            match: 'ga_tracking_code',
            replacement: '<%= ga_tracking_code.dist %>',
          }
        ]
      },
      files: [
        {expand: true, flatten: true, src: ['./kibana/config.js'], dest: '<%= buildTempDir %>/src/'},
        {expand: true, flatten: true, src: ['./common/analytics.js'], dest: '<%= buildTempDir %>/common/'},
        {expand: true, flatten: true, src: ['./common/PhoneHome.js'], dest: '<%= buildTempDir %>/common/'}
      ]
    },
    git_commits: {
      options: {
        patterns: [
          {
            match: 'MARVEL_REVISION',
            replacement: '<%= marvelCommit %>'
          },
          {
            match: /@MARVEL_REV@/g,
            replacement: config.pkg.version + "-" + '<%= marvelCommit %>'
          },
          {
            match: 'KIBANA_REVISION',
            replacement: '<%= kibanaCommit %>'
          }
        ]
      },
      files: [
        {
          cwd: '<%= buildSiteDir %>',
          expand: true, src: ['**/*'], dest: '<%= buildSiteDir %>/'}
      ]
    },
    kibana_replace_title: {
      options: {
        patterns: [
          {
            match: /<title>.*?<\/title>/,
            replacement: '<title>{{dashboard.current.title ? dashboard.current.title : "Marvel"}}</title>'
          }
        ]
      },
      files: [
        {
          cwd: '<%= buildSiteDir %>',
          expand: true, src: ['kibana/index.html'], dest: '<%= buildSiteDir %>/'}
      ]
    }
  };
};
