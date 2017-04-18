define(function (require) {
  let module = require('ui/modules').get('kibana');

  module.constant('quickRanges', [
    { from: 'now/d',    to: 'now/d',    display: '今日',                 section: 0 },
    { from: 'now/w',    to: 'now/w',    display: '本周',             section: 0 },
    { from: 'now/M',    to: 'now/M',    display: '本月',            section: 0 },
    //{ from: 'now/y',    to: 'now/y',    display: 'This year',             section: 0 },
    { from: 'now/d',    to: 'now',      display: '今日(截止当前)',        section: 0 },
    { from: 'now/w',    to: 'now',      display: '本周(截止当前)',          section: 0 },
    { from: 'now/M',    to: 'now',      display: '本月(截止当前)',         section: 0 },
    //{ from: 'now/y',    to: 'now',      display: 'Year to date',          section: 0 },

    { from: 'now-1d/d', to: 'now-1d/d', display: '昨日',             section: 1 },
    { from: 'now-2d/d', to: 'now-2d/d', display: '前日',  section: 1 },
    { from: 'now-7d/d', to: 'now-7d/d', display: '上周今日',    section: 1 },
    { from: 'now-1w/w', to: 'now-1w/w', display: '上周',         section: 1 },
   // { from: 'now-1M/M', to: 'now-1M/M', display: 'Previous month',        section: 1 },
   // { from: 'now-1y/y', to: 'now-1y/y', display: 'Previous year',         section: 1 },

    { from: 'now-15m',  to: 'now',      display: '最近15分钟',       section: 2 },
    { from: 'now-30m',  to: 'now',      display: '最近30分钟',       section: 2 },
    { from: 'now-1h',   to: 'now',      display: '最近1小时',           section: 2 },
    { from: 'now-4h',   to: 'now',      display: '最近4小时',          section: 2 },
    { from: 'now-12h',  to: 'now',      display: '最近12小时',         section: 2 },
    { from: 'now-24h',  to: 'now',      display: '最近24小时',         section: 2 },
    { from: 'now-7d',   to: 'now',      display: '最近7天',           section: 2 },

  /*  { from: 'now-30d',  to: 'now',      display: 'Last 30 days',          section: 3 },
    { from: 'now-60d',  to: 'now',      display: 'Last 60 days',          section: 3 },
    { from: 'now-90d',  to: 'now',      display: 'Last 90 days',          section: 3 },
    { from: 'now-6M',   to: 'now',      display: 'Last 6 months',         section: 3 },
    { from: 'now-1y',   to: 'now',      display: 'Last 1 year',           section: 3 },
    { from: 'now-2y',   to: 'now',      display: 'Last 2 years',          section: 3 },
    { from: 'now-5y',   to: 'now',      display: 'Last 5 years',          section: 3 },*/

  ]);

});
