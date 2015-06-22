var tests = [];
for (var file in window.__karma__.files) {
    if (/^\/base\/scripts\/.*spec\.js$/.test(file)) {
        tests.push(file);
    }
}

requirejs.config({
    // Karma serves files from '/base'
    baseUrl: '/base',

    paths: {
        'angular': './bower_components/angular/angular.min',
        'sassbootstrap': './bower_components/sass-bootstrap/dist/js/bootstrap',
        'sass-bootstrap': './bower_components/sass-bootstrap/dist/js/bootstrap',
        'angular-scenario': './bower_components/angular-scenario/angular-scenario',
        'angular-sanitize': './bower_components/angular-sanitize/angular-sanitize',
        'angular-resource': './bower_components/angular-resource/angular-resource',
        'angular-mocks': './bower_components/angular-mocks/angular-mocks',
        'angular-cookies': './bower_components/angular-cookies/angular-cookies',
        'angular-ui-router': './bower_components/angular-ui-router/release/angular-ui-router',
        'angular-animate': './bower_components/angular-animate/angular-animate',
        'angular-strap': './bower_components/angular-strap/dist/angular-strap.min',
        'angular-strap-tpl': './bower_components/angular-strap/dist/angular-strap.tpl.min'
    },

    shim: {
        'angular': {'exports': 'angular'},
        'angular-cookies': ['angular'],
        'angular-sanitize': ['angular'],
        'angular-resource': ['angular'],
        'angular-ui-router': ['angular'],
        'angular-animate': {
            exports: 'angular'
        },
        'angular-strap': [
            'angular',
            'angular-animate'
        ],
        'angular-strap-tpl': [
            'angular',
            'angular-animate',
            'angular-strap'
        ],
        'angular-mocks': {
            deps: [
                'angular'
            ],
            exports: 'angular.mock'
        }
    },

    // ask Require.js to load these files (all our tests)
    deps: tests,

    // start test run, once Require.js is done
    callback: window.__karma__.start
});
