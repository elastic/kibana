echo test >> C:\vagrant\qa\temp.text

echo on

@REM cd to the qa/ dir where this script lives
cd C:\vagrant\qa

for /F "eol=#" %%i in (envvars.sh) do set %%i
echo "ESURL=%ESURL%""


@REM  if we installed a config without security enabled and now want to enable it
@REM  we need to set a password for the kibana user, logstash user, and create a bunch
@REM  of other users for beats, etc.

@REM  The problem I still have is that I  *think* I couldn't have the elasticsearch.username and
@REM  elasticsearch.password params in the Kibana.yml if security wasn't enabled?
@REM  That means I have to add them and restart?  Or use the keystore?

curl -k -XPUT --basic "%ESURL%/_xpack/security/user/kibana/_password?pretty" -H "Content-Type: application/json" -d "{ \"password\": \"changeit\" }"

curl -k -XPUT --basic "%ESURL%/_xpack/security/user/logstash_system/_password?pretty" -H "Content-Type: application/json" -d "{ \"password\": \"changeit\" }"


echo -e "\n-- `date` Create all users and roles"
@REM type users_roles.txt | while read line; do ./create_roles_users.sh %ESURL% $line; done
for /F "tokens=1,*" %%i in (users_roles.txt) do curl -k -S -POST %ESURL%/_xpack/security/%%i -H "Content-Type: application/json" -d "%%j"
